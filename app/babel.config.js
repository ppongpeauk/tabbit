/**
 * @author Pete Pongpeauk <ppongpeauk@gmail.com>
 * @description Babel configuration for Expo with NativeWind v4
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};

