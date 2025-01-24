import { createProxyMiddleware } from 'http-proxy-middleware';

export const config = {
    api: {
        bodyParser: false,
    },
};

const API_TARGET = 'https://showcase.leantechniques.com/';

export default createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    pathRewrite: {
        '^/api/proxy': '',
    },
    onProxyReq: (proxyReq, req) => {
        console.log(`Proxying request: ${req.url}`);
    },
});
