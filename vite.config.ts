import { defineConfig } from 'vite';
import { rippleRouter } from './src/plugin';

export default defineConfig(({ mode }) => ({
	plugins: [rippleRouter()],
	build: {
		target: "esnext",
		minify: false,
		sourcemap: mode !== 'production',
		lib: {
			entry: 'src/index.ts',
			formats: ['es'],
			fileName: 'index'
		},
	}
}));
