"use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
    async validateCart(ctx) {
        const cart = ctx.request.body;
        let errorRes = null;
        try {
            // GET products and transfrom from request
            let products = [];
            for (let i = 0; i < cart.products.length; i++) {
                const productRaw = cart.products[i];
                // get product
                const product = await strapi.entityService.findOne(
                    "api::product.product",
                    productRaw.id,
                    {
                        fields: [
                            "id",
                            "name",
                            "slug",
                            "description",
                            "detail",
                            "salePrice",
                            "listPrice",
                        ],
                        populate: {
                            images: {
                                fields: ["formats", "url", "alternativeText"],
                            },
                            priceRules: true,
                            category: true,
                        },
                    }
                );
                if (product) {
                    products.push(product);
                } else {
                    if (!errorRes) {
                        errorRes = {
                            message: `Not found product at index ${i}`,
                            invalidProduct: productRaw,
                        };
                    }
                }
            }
            for (let i = 0; i < products.length; i++) {
                products[i].quantity = cart.products[i].quantity;
            }

            let numOfProducts = 0;
            let totalMoney = 0;
            let discountMoney = 0;
            let intoMoney = 0;
            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                if (product.priceRules?.length === 0) {
                    const totalPrice = product.quantity * product.salePrice;
                    product.totalPrice = totalPrice;
                    totalMoney += totalPrice;
                } else {
                    // [...product.priceRules] To fix sort
                    const priceRulesSorted = [...product.priceRules].sort(
                        (a, b) => b.minQuantity - a.minQuantity
                    );
                    let quantity = product.quantity;
                    let totalPrice = 0;
                    priceRulesSorted.forEach((priceRule) => {
                        const quantityOfRule =
                            Math.floor(quantity / priceRule.minQuantity) * priceRule.minQuantity;
                        totalPrice += quantityOfRule * priceRule.price;
                        quantity -= quantityOfRule;
                    });
                    totalPrice += quantity * product.salePrice;
                    product.totalPrice = totalPrice;
                    totalMoney += totalPrice;
                }

                // Check total price
                if (product.totalPrice !== cart.products[i].totalPrice) {
                    if (!errorRes) {
                        errorRes = {
                            message: `Incorrect price product at index ${i}`,
                            priceInServer: product.totalPrice,
                            priceInClient: cart.products[i].totalPrice,
                        };
                    }
                }
            }

            // Calc billing
            // todo: DISCOUNT RULE
            numOfProducts = products.length;
            intoMoney = totalMoney - discountMoney;
            if (
                numOfProducts !== cart.billing.numOfProducts ||
                totalMoney !== cart.billing.totalMoney ||
                discountMoney !== cart.billing.discountMoney ||
                intoMoney !== cart.billing.intoMoney
            ) {
                if (!errorRes) {
                    errorRes = {
                        message: "Incorrect billing",
                        billingInServer: {
                            numOfProducts,
                            totalMoney,
                            discountMoney,
                            intoMoney,
                        },
                        billingInClient: {
                            numOfProducts: cart.billing.numOfProducts,
                            totalMoney: cart.billing.totalMoney,
                            discountMoney: cart.billing.discountMoney,
                            intoMoney: cart.billing.intoMoney,
                        },
                    };
                }
            }

            const objRes = {};
            objRes.products = products;
            objRes.billing = {
                numOfProducts,
                totalMoney,
                discountMoney,
                intoMoney,
            };
            if (!errorRes) {
                return objRes;
            } else {
                errorRes.validCart = objRes;
                return ctx.badRequest("invalidCart", errorRes);
            }
        } catch (error) {
            console.log(error);
            return ctx.internalServerError("internal server error");
        }
    },
}));
