export type SystemOptions<T> = ({
	parent: System<T>
	path: `/${string}/`
	initial?: [`/${string}`, T][]
} | { initial: [`/${string}`, T][] })

export class System<T> {
	static Symbol = Symbol("Tree");

	#files: [`/${string}`, T][] = [];
	#parent: System<T> | null = null;
	#path: `/${string}/` | "" = "";

	constructor(options?: SystemOptions<T>) {
		if (options) {
			if ("parent" in options) {
				this.#parent = options.parent
				this.#path = options.path
			}
			if ("initial" in options && options.initial) {
				this.#files = options.initial;
			}
		}
	}

	get files(): [`/${string}`, T][] {
		if (this.#parent == null) return [...this.#files];
		return this.#parent.files
			.filter(([path]) => path.startsWith(this.#path))
			.map(([path, value]) => [path.slice(this.#path.length - 1) as `/${string}`, value]);
	}

	private normalize(path: string): `/${string}` {
		return new URL(`${"file://"}${path.startsWith("/") ? "" : "/"}${path}`).pathname as `/${string}`;
	}


	set files(value: [`/${string}`, T][]) {
		if (this.#parent == null) {
			this.#files = value.map(([path, value]) => [this.normalize(path), value]);
			return;
		}

		const parentFiles = this.#parent.files.filter(([path]) => !path.startsWith(this.#path));
		for (const [path, val] of value) {
			const absolutePath = this.normalize(`${this.#path}${path.slice(1)}`);
			const index = parentFiles.findIndex(([p]) => p === absolutePath);
			if (index >= 0) parentFiles.splice(index, 1);
			parentFiles.push([absolutePath, val]);
		}

		this.#parent.files = parentFiles;
	}

	addFile(value: [`/${string}`, T]) {
		this.files = this.files.concat([value])
	}

	addFiles(value: [`/${string}`, T][]) {
		this.files = this.files.concat(value)
	}

	get paths() {
		return new Set(this.files.map(([path]) => {
			if (path === "/") return "/";
			const [, first, second] = path.split("/");
			return second != undefined ? `/${first}/` : `/${first}`;
		}))
	}

	get fullPaths() {
		return new Set(this.files.map(([path]) => path))
	}

	getElement(path: `/${string}`) {
		return this.files.find(([paths]) => path == paths)?.[1]
	}

	get tree() {
		const tree = new Tree<T>(this);
		for (const [rawPath, content] of this.files) {
			const parts = rawPath.split('/').slice(1);
			let current = tree;

			for (let i = 0; i < parts.length; i++) {
				const isFile = i === parts.length - 1;
				const part = "/" + parts[i] + (!isFile ? "/" : "");

				if (part === "/" || isFile) {
					current[part] = content;
				} else if (typeof current[part] !== "undefined") {
					if (!(current[part] instanceof Tree)) {
						throw new Error(`Cannot create directory over file: /${parts.slice(0, i + 1).join("/")}`)
					}
					current = current[part];
				} else {
					current[part] = new Tree<T>(new System({ parent: current[System.Symbol], path: `/${part}/` }));
					current = current[part];
				}
			}
		}

		return tree;
	}
}

class Tree<T> {
	[System.Symbol]: System<T>
	[key: string]: Tree<T> | T

	constructor(fileSystem: System<T>) {
		this[System.Symbol] = fileSystem
	}
}