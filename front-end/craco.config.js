// craco.config.js
const webpack = require('webpack');
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        util: require.resolve('util/'),
      };
      
      // Add alias for shared module
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@shared': path.resolve(__dirname, '../shared'),
      };
      
      return webpackConfig;
    },
  },
};
