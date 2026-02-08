"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNestServer = void 0;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("./app.module");
const express = require("express");
const server = express();
const createNestServer = async () => {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(server));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors({
        origin: '*',
        credentials: true,
    });
    await app.init();
    return server;
};
exports.createNestServer = createNestServer;
exports.default = async (req, res) => {
    const app = await (0, exports.createNestServer)();
    app(req, res);
};
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    (0, exports.createNestServer)().then(() => {
        const port = process.env.PORT || 3000;
        server.listen(port, () => {
            console.log(`🚀 API running on http://0.0.0.0:${port}`);
        });
    });
}
//# sourceMappingURL=main.js.map