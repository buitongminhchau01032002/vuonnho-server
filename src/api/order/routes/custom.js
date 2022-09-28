module.exports = {
    routes: [
        {
            method: "POST",
            path: "/orders/validate-and-order",
            handler: "api::order.order.validateCart",
            config: {
                auth: false,
            },
        },
    ],
};
