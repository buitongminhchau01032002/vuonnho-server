module.exports = {
    routes: [
        {
            method: "GET",
            path: "/products/find-by-slug/:slug",
            handler: "api::product.product.findBySlug",
            config: {
                auth: false,
            },
        },
    ],
};
