module.exports = {
    routes: [
        {
            method: "GET",
            path: "/categories/find-by-slug/:slug",
            handler: "api::category.category.findBySlug",
            config: {
                auth: false,
            },
        },
    ],
};
