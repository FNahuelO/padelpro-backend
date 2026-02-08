"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const app_module_1 = require("./app.module");
const express = require("express");
const server = express();
let cachedApp;
async function createNestServer() {
    if (!cachedApp) {
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
        cachedApp = server;
    }
    return cachedApp;
}
exports.default = async (req, res) => {
    const app = await createNestServer();
    app(req, res);
};
//# sourceMappingURL=serverless.js.map