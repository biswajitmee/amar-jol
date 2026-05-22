module.exports = function glslRawLoader(source) {
  const shaderSource = source.toString().replace(/\r\n/g, "\n");
  return `export default ${JSON.stringify(shaderSource)};`;
};
