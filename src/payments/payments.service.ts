import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsRepository } from './payments.repository';
import { MatchesRepository } from '../matches/matches.repository';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type MatchRow = {
  id: string;
  club_id: string | null;
  needed_players: number;
  status: string;
  title: string;
  court_slot_id?: string | null;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly matchesRepo: MatchesRepository,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  isMockMode(): boolean {
    return (
      process.env.PAYMENTS_MOCK === 'true' ||
      !process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
    );
  }

  private publicApiBase(): string {
    return (process.env.API_PUBLIC_URL || process.env.APP_URL || 'http://localhost:5000').replace(
      /\/$/,
      '',
    );
  }

  calculateDepositAmount(
    courtPricePerHour: number,
    durationHours: number,
    neededPlayers: number,
    depositPercent: number,
  ): number {
    const players = Math.max(neededPlayers, 2);
    const totalCourt = courtPricePerHour * durationHours;
    const sharePerPlayer = totalCourt / players;
    const deposit = (sharePerPlayer * depositPercent) / 100;
    return Math.round(deposit * 100) / 100;
  }

  async resolveDepositAmount(match: MatchRow): Promise<{ amount: number; required: boolean; currency: string }> {
    if (!match.club_id) {
      return { amount: 0, required: false, currency: 'ARS' };
    }

    const club = await this.paymentsRepo.getClubPricing(match.club_id);
    if (!club) {
      return { amount: 0, required: false, currency: 'ARS' };
    }

    const pricePerHour = Number(club.court_price_per_hour ?? 0);
    const depositPercent = Number(club.deposit_percent ?? 25);
    let durationHours = Number(club.court_duration_hours ?? 1.5);

    if (match.court_slot_id) {
      const slotHours = await this.paymentsRepo.getCourtSlotDurationHours(match.court_slot_id);
      if (slotHours != null) durationHours = slotHours;
    }

    const amount = this.calculateDepositAmount(
      pricePerHour,
      durationHours,
      match.needed_players,
      depositPercent,
    );

    return {
      amount,
      required: amount > 0,
      currency: 'ARS',
    };
  }

  private async getMatchOrThrow(matchId: string): Promise<MatchRow> {
    const match = await this.matchesRepo.getById(matchId);
    if (!match) throw new NotFoundException('Partido no encontrado');
    return match as MatchRow;
  }

  async getDepositStatusForUser(matchId: string, userId: string) {
    const match = await this.getMatchOrThrow(matchId);
    const playerId = await this.matchesRepo.getPlayerIdByUserId(userId);
    if (!playerId) {
      throw new BadRequestException('Completá tu perfil de jugador');
    }

    const { amount, required, currency } = await this.resolveDepositAmount(match);
    const deposit = await this.paymentsRepo.getDepositByMatchPlayer(matchId, playerId);
    const allDeposits = await this.paymentsRepo.listDepositsForMatch(matchId);
    const coveredGuests = (await this.matchesRepo.listGuestInvites(matchId))
      .filter((guest: any) => guest.sponsor_user_id === userId)
      .map((guest: any) => ({
        id: guest.id,
        name: String(guest.name),
      }));
    const coveredGuestSlots =
      deposit?.covered_guest_slots != null
        ? Number(deposit.covered_guest_slots)
        : coveredGuests.length;
    const totalAmount =
      deposit?.amount != null ? Number(deposit.amount) : amount * Math.max(1, coveredGuestSlots + 1);

    let clubName: string | undefined;
    if (match.club_id) {
      const club = await this.paymentsRepo.getClubPricing(match.club_id);
      clubName = club?.name;
    }

    return {
      matchId,
      required,
      amount: Math.round(totalAmount * 100) / 100,
      currency,
      clubName,
      provider: this.isMockMode() ? 'MOCK' : 'MERCADOPAGO',
      paid: deposit?.status === 'APPROVED',
      depositStatus: deposit?.status ?? null,
      checkoutUrl: deposit?.checkout_url ?? null,
      coveredGuestSlots,
      coveredGuests,
      players: allDeposits.map((d: any) => ({
        userId: d.user_id,
        userName: d.user_name,
        amount: Number(d.amount),
        status: d.status,
        paidAt: d.paid_at,
        coveredGuestSlots: Number(d.covered_guest_slots ?? 0),
      })),
    };
  }

  async createCheckout(matchId: string, userId: string) {
    const match = await this.getMatchOrThrow(matchId);
    const playerId = await this.matchesRepo.getPlayerIdByUserId(userId);
    if (!playerId) {
      throw new BadRequestException('Completá tu perfil de jugador');
    }

    const isParticipant = await this.isMatchParticipant(matchId, playerId);
    if (!isParticipant) {
      throw new BadRequestException('No participás de este partido');
    }

    if (!['OPEN', 'FULL'].includes(match.status)) {
      throw new BadRequestException('Este partido ya no acepta confirmación con seña');
    }

    const { amount, required, currency } = await this.resolveDepositAmount(match);
    const coveredGuestSlots = (await this.matchesRepo.listGuestInvites(matchId)).filter(
      (guest: any) => guest.sponsor_user_id === userId,
    ).length;
    const totalAmount = Math.round(amount * Math.max(1, coveredGuestSlots + 1) * 100) / 100;
    if (!required || amount <= 0) {
      await this.approveAndConfirm(matchId, playerId, userId, null);
      return {
        required: false,
        paid: true,
        amount: 0,
        message: 'No se requiere seña para este partido',
      };
    }

    const existing = await this.paymentsRepo.getDepositByMatchPlayer(matchId, playerId);
    if (existing?.status === 'APPROVED') {
      return {
        required: true,
        paid: true,
        amount: Number(existing.amount),
        checkoutUrl: existing.checkout_url,
        depositId: existing.id,
        coveredGuestSlots: Number(existing.covered_guest_slots ?? 0),
      };
    }

    const externalReference = `${matchId}:${playerId}`;
    const provider = this.isMockMode() ? 'MOCK' : 'MERCADOPAGO';

    const deposit = await this.paymentsRepo.upsertPendingDeposit({
      matchId,
      playerId,
      userId,
      amount: totalAmount,
      currency,
      provider,
      externalReference,
      coveredGuestSlots,
    });

    if (this.isMockMode()) {
      const mockUrl = `${this.publicApiBase()}/payments/mock/checkout?depositId=${deposit.id}`;
      await this.paymentsRepo.updateCheckoutUrl(deposit.id, mockUrl, 'mock');
      return {
        required: true,
        paid: false,
        amount: totalAmount,
        currency,
        provider: 'MOCK',
        depositId: deposit.id,
        checkoutUrl: mockUrl,
        mock: true,
        coveredGuestSlots,
      };
    }

    const checkout = await this.createMercadoPagoPreference(
      externalReference,
      match,
      totalAmount,
      currency,
    );
    await this.paymentsRepo.updateCheckoutUrl(deposit.id, checkout.initPoint, checkout.preferenceId);

    return {
      required: true,
      paid: false,
      amount: totalAmount,
      currency,
      provider: 'MERCADOPAGO',
      depositId: deposit.id,
      checkoutUrl: checkout.initPoint,
      preferenceId: checkout.preferenceId,
      coveredGuestSlots,
    };
  }

  private async isMatchParticipant(matchId: string, playerId: string): Promise<boolean> {
    const detail = await this.matchesRepo.getDetail(matchId);
    return !!detail?.players?.some((p: { playerId: string }) => p.playerId === playerId);
  }

  private async createMercadoPagoPreference(
    externalReference: string,
    match: MatchRow,
    amount: number,
    currency: string,
  ) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN!.trim();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MercadoPagoConfig, Preference } = require('mercadopago');
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const base = this.publicApiBase();
    const title = `Seña cancha — ${match.title}`.slice(0, 120);

    const result = await preference.create({
      body: {
        items: [
          {
            id: externalReference,
            title,
            quantity: 1,
            unit_price: amount,
            currency_id: currency,
          },
        ],
        external_reference: externalReference,
        notification_url: `${base}/payments/webhooks/mercadopago`,
        back_urls: {
          success: `${base}/payments/return/success?ref=${encodeURIComponent(externalReference)}`,
          failure: `${base}/payments/return/failure?ref=${encodeURIComponent(externalReference)}`,
          pending: `${base}/payments/return/pending?ref=${encodeURIComponent(externalReference)}`,
        },
        auto_return: 'approved',
      },
    });

    const initPoint = result.init_point || result.sandbox_init_point;
    if (!initPoint) {
      throw new BadRequestException('Mercado Pago no devolvió URL de pago');
    }

    return { initPoint, preferenceId: String(result.id) };
  }

  async simulateMockPayment(depositId: string, userId: string) {
    if (!this.isMockMode()) {
      throw new BadRequestException('Simulación solo disponible en modo mock');
    }
    const deposit = await this.paymentsRepo.getDepositById(depositId);
    if (!deposit) throw new NotFoundException('Pago no encontrado');
    if (deposit.user_id !== userId) {
      throw new BadRequestException('No podés pagar la seña de otro jugador');
    }
    await this.approveDeposit(deposit.id, 'mock-payment');
    return { ok: true, depositId: deposit.id };
  }

  async handleMercadoPagoWebhook(body: { type?: string; data?: { id?: string }; action?: string }) {
    if (!body?.data?.id) return { ok: true, ignored: true };

    if (body.type !== 'payment') {
      return { ok: true, ignored: true };
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) return { ok: false, error: 'not_configured' };

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { MercadoPagoConfig, Payment } = require('mercadopago');
      const client = new MercadoPagoConfig({ accessToken });
      const paymentClient = new Payment(client);
      const payment = await paymentClient.get({ id: body.data.id });

      if (payment.status === 'approved' && payment.external_reference) {
        const deposit = await this.paymentsRepo.getDepositByExternalRef(
          String(payment.external_reference),
        );
        if (deposit) {
          await this.approveDeposit(deposit.id, String(payment.id));
        }
      }
    } catch (err) {
      this.logger.error('Webhook Mercado Pago', err);
      throw err;
    }

    return { ok: true };
  }

  async approveDeposit(depositId: string, providerPaymentId?: string) {
    const deposit = await this.paymentsRepo.markApproved(depositId, providerPaymentId);
    if (!deposit) {
      const existing = await this.paymentsRepo.getDepositById(depositId);
      if (existing?.status === 'APPROVED') return existing;
      return null;
    }

    const match = await this.approveAndConfirm(
      deposit.match_id,
      deposit.player_id,
      deposit.user_id,
      deposit.id,
    );
    if (match) {
      this.realtimeGateway.emitMatchUpdated(match);
    }
    return deposit;
  }

  private async approveAndConfirm(
    matchId: string,
    playerId: string,
    userId: string,
    _depositId: string | null,
  ) {
    await this.matchesRepo.confirmPlayer(matchId, playerId);

    const match = await this.getMatchOrThrow(matchId);
    const joinedCount = await this.matchesRepo.countJoinedPlayers(matchId);
    const confirmedCount = await this.matchesRepo.countConfirmedPlayers(matchId);

    if (joinedCount >= match.needed_players && confirmedCount >= match.needed_players) {
      await this.matchesRepo.updateStatus(matchId, 'CONFIRMED');
    } else if (match.status === 'OPEN' && joinedCount >= match.needed_players) {
      await this.matchesRepo.updateStatus(matchId, 'FULL');
    }

    return this.matchesRepo.getDetail(matchId);
  }

  async assertDepositPaid(matchId: string, playerId: string) {
    const match = await this.getMatchOrThrow(matchId);
    const { required } = await this.resolveDepositAmount(match);
    if (!required) return;

    const deposit = await this.paymentsRepo.getDepositByMatchPlayer(matchId, playerId);
    if (!deposit || deposit.status !== 'APPROVED') {
      throw new BadRequestException('Debés pagar la seña de la cancha antes de confirmar');
    }
  }
}
