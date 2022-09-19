"use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
    async validateCart(ctx) {
        const cart = ctx.request.body;
        try {
            let totalMoney = 0;
            const products = [];
            for (let i = 0; i < cart.products.length; i++) {
                const productRaw = cart.products[i];
                const product = await strapi.entityService.findOne(
                    "api::product.product",
                    productRaw.id,
                    {
                        fields: ["id", "name", "slug", "salePrice", "listPrice"],
                        populate: {
                            images: {
                                fields: ["formats", "url", "alternativeText"],
                            },
                            priceRules: true,
                        },
                    }
                );
                if (product) {
                    products.push(product);
                    if (product.priceRules.length === 0) {
                        totalMoney += productRaw.quantity * product.salePrice;
                    } else {
                        const priceRulesSorted = product.priceRules.sort(
                            (a, b) => b.minQuantity - a.minQuantity
                        );
                        let quantity = productRaw.quantity;
                        let totalPrice = 0;
                        priceRulesSorted.forEach((priceRule) => {
                            const quantityOfRule =
                                Math.floor(quantity / priceRule.minQuantity) *
                                priceRule.minQuantity;
                            totalPrice += quantityOfRule * priceRule.price;
                            quantity -= quantityOfRule;
                        });
                        totalPrice += quantity * product.salePrice;
                        totalMoney += totalPrice;
                    }
                }
            }
            const objRes = {};
            // todo: DISCOUNT RULE

            objRes.products = products;
            objRes.totalBilling = {
                totalMoney,
                discountMoney: 0,
                intoMoney: totalMoney,
            };
            return objRes;
        } catch (error) {
            console.log(error);
            return ctx.badRequest("name is missing", { mess: "unknow" });
        }
    },
}));
