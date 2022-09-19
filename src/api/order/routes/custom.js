module.exports = {
    routes: [
        {
            method: "POST",
            path: "/order/validate-cart",
            handler: "api::order.order.validateCart",
            config: {
                auth: false,
            },
        },
    ],
};
