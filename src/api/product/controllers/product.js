"use strict";

/**
 * product controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::product.product", ({ strapi }) => ({
    async findBySlug(ctx) {
        const { slug } = ctx.params;

        const query = {
            ...ctx.query,
            filters: { ...ctx.query.filter, slug },
        };

        const product = await strapi.entityService.findMany("api::product.product", query);

        return this.transformResponse(product[0]);
    },
}));
