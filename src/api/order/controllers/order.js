"use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
    async validateCart(ctx) {
        const reqBody = ctx.request.body;
        let errorRes = null;

        try {
            // VALIDATE
            let products = [];
            for (let i = 0; i < reqBody.products.length; i++) {
                const productRaw = reqBody.products[i];
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
                            images: true,
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
                products[i].quantity = reqBody.products[i].quantity;
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
                if (product.totalPrice !== reqBody.products[i].totalPrice) {
                    if (!errorRes) {
                        errorRes = {
                            message: `Incorrect price product at index ${i}`,
                            priceInServer: product.totalPrice,
                            priceInClient: reqBody.products[i].totalPrice,
                        };
                    }
                }
            }

            // Calc billing
            // todo: DISCOUNT RULE
            numOfProducts = products.length;
            intoMoney = totalMoney - discountMoney;
            if (
                numOfProducts !== reqBody.billing.numOfProducts ||
                totalMoney !== reqBody.billing.totalMoney ||
                discountMoney !== reqBody.billing.discountMoney ||
                intoMoney !== reqBody.billing.intoMoney
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
                            numOfProducts: reqBody.billing.numOfProducts,
                            totalMoney: reqBody.billing.totalMoney,
                            discountMoney: reqBody.billing.discountMoney,
                            intoMoney: reqBody.billing.intoMoney,
                        },
                    };
                }
            }

            // Invalidate
            if (errorRes) {
                const objRes = {};
                objRes.products = products;
                objRes.billing = {
                    numOfProducts,
                    totalMoney,
                    discountMoney,
                    intoMoney,
                };
                errorRes.validCart = objRes;
                return ctx.badRequest("invalidCart", errorRes);
            }

            // CREATE ORDER

            let entryObj = {};
            // format products
            const productFormatted = products.map((product) => {
                let priceRules = product.priceRules.map((priceRule) => ({
                    minQuantity: priceRule.minQuantity,
                    price: priceRule.price,
                }));

                let image = product.images[0];
                delete image.id;
                delete image.createdAt;
                delete image.updatedAt;
                return {
                    name: product.name,
                    quantity: product.quantity,
                    price: product.salePrice,
                    totalPrice: product.totalPrice,
                    priceRules: priceRules,
                    //todo: fix image
                    //image: image,
                    product: product.id,
                };
            });

            // format confirmationTimes
            const confirmationTimes = reqBody.orderConfirmationTimes.map((time) => ({
                begin: time.begin,
                end: time.end,
            }));

            // let numOfProducts = 0;
            // let totalMoney = 0;
            // let discountMoney = 0;
            // let intoMoney = 0;

            // create entry
            entryObj.name = reqBody.name;
            entryObj.address = reqBody.address;
            entryObj.phone = reqBody.phone;
            entryObj.note = reqBody.note;
            entryObj.numOfProducts = numOfProducts;
            entryObj.totalMoney = totalMoney;
            entryObj.discountMoney = discountMoney;
            entryObj.intoMoney = intoMoney;

            entryObj.products = productFormatted;
            entryObj.confirmationTimes = confirmationTimes;

            console.log("GOGO");
            console.log(entryObj);
            console.log(entryObj.products[0].image);
            console.log(entryObj.products[0].priceRules);

            const newOrder = await strapi.entityService.create("api::order.order", {
                data: entryObj,
            });

            if (!newOrder) {
                return ctx.badRequest("createOrderError", {});
            }

            return {
                success: true,
                newOrder,
            };
        } catch (error) {
            console.log(error);
            return ctx.internalServerError("internal server error");
        }
    },
}));
