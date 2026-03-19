module.exports = {
  datasets: "./datasets/*.data.mdx",
  stories: "./stories/*.stories.mdx",

  pageOverrides: {
    aboutContent: "./overrides/about.mdx",
    homeContent: "./overrides/home.mdx",
    headerBrand: "./overrides/header-brand/index.mdx",
    pageFooter: "./overrides/page-footer/index.mdx",
  },

  strings: {
    stories: {
      one: "Story",
      other: "Stories",
    },
  },

  navItems: {
    headerNavItems: [
      { id: "data-catalog", title: "Data Catalog", to: "/data-catalog", type: "internalLink" },
      { id: "exploration", title: "Exploration", to: "/exploration", type: "internalLink" },
      { id: "stories", title: "Stories", to: "/stories", type: "internalLink" },
    ],
  },
};
