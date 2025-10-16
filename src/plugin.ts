import { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const PATH = 'virtual:ripple-routes';
const ROUTES = path.resolve(process.cwd(), 'src/routes');
let prevFiles: string[] = [];

function getFilesRecursive(dir: string): string[] {
	const files = []
	for (const entry of fs.readdirSync(dir)) {
		const full = path.join(dir, entry)
		if (fs.statSync(full).isDirectory()) {
			files.push(...getFilesRecursive(full))
		} else {
			files.push(full)
		}
	}
	return files
}

export function rippleRouter(options: { ROUTES: string } = { ROUTES }): Plugin {
	const CurrentRoute = options.ROUTES ?? ROUTES

	return {
		name: "ripple-routes",
		resolveId(id) {
			if (id === PATH) return id
		},
		load(id) {
			if (id === PATH) {
				const routesDir = path.resolve(process.cwd(), CurrentRoute)
				if (!fs.existsSync(routesDir)) {
					return `export default {}`
				}
				const files = getFilesRecursive(routesDir).filter(f => f.endsWith('.ripple'))

				const importValues = files
					.map((file, i) => {
						const varName = `route${i}`
						const relative = path.relative(routesDir, file)
						const posix = relative.split(path.sep).join('/')
						const importPath = `/${CurrentRoute}/${posix}`
						return `import ${varName} from '${importPath}'`
					})
					.join('\n');

				const exportValues = files
					.map((file, i) => {
						const relative = path.relative(routesDir, file)
						const withoutExt = relative.replace(path.extname(relative), '')
						const routeKey = withoutExt.split(path.sep).join('/')
						return `  '${routeKey}': route${i}`
					})
					.join(',\n')

				return [
					importValues,
					'',
					'export default {',
					exportValues,
					'}'
				].join('\n')
			}
		},

		configureServer(server) {
			const routesDir = path.resolve(process.cwd(), CurrentRoute)
			if (!fs.existsSync(routesDir)) {
				return
			}
			server.watcher.add(routesDir)

			server.watcher.on('all', (event, file) => {
				if (!file.endsWith('.ripple')) return

				const currentFiles = getFilesRecursive(routesDir).filter(f => f.endsWith('.ripple'))

				const added = currentFiles.filter(f => !prevFiles.includes(f))
				const removed = prevFiles.filter(f => !currentFiles.includes(f))
				const changed = event === 'change' ? [file] : []

				if (added.length || removed.length || changed.length) {
					prevFiles = currentFiles

					const module = server.moduleGraph.getModuleById(PATH)
					if (module) {
						server.moduleGraph.invalidateModule(module)

						server.ws.send({
							type: 'update',
							updates: [
								{
									type: 'js-update',
									path: PATH,
									acceptedPath: PATH,
									timestamp: Date.now()
								}
							]
						})
					}
				}
			})
		}
	}
}