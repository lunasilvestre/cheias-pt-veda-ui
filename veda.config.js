const dataCatalogNavItem = {
  id: "data-catalog",
  title: "Data Catalog",
  to: "/data-catalog",
  type: "internalLink",
};

const storiesNavItem = {
  id: "stories",
  title: "Stories",
  to: "/stories",
  type: "internalLink",
};

const explorationNavItem = {
  id: "exploration",
  title: "Exploration",
  to: "/exploration",
  type: "internalLink",
};

let headerNavItems = [dataCatalogNavItem, explorationNavItem, storiesNavItem];

module.exports = {
  datasets: "./datasets/*.data.mdx",
  stories: "./stories/*.stories.mdx",

  pageOverrides: {
    aboutContent: "./overrides/about.mdx",
  },

  strings: {
    stories: {
      one: "Data Story",
      other: "Data Stories",
    },
  },

  navItems: {
    headerNavItems: headerNavItems,
  },
};
