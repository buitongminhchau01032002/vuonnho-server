"use strict";

/**
 * category controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::category.category", ({ strapi }) => ({
    async findBySlug(ctx) {
        const { slug } = ctx.params;

        const category = await strapi.db.query("api::category.category").findOne({
            where: { slug },
        });
        const sanitizedEntity = await this.sanitizeOutput(category);

        return this.transformResponse(sanitizedEntity);
    },
}));
