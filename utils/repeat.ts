import NodeCache from "node-cache";

class Node<T> {
	public msg: T;
	public user: Set<number>;

	constructor(msg: T) {
		this.msg = msg;
		this.user = new Set();
	}

	addUser(user: number): boolean {
		let b: boolean = this.user.has(user);
		b || this.user.add(user);
		return !b;
	}

	get times(): number {
		return this.user.size;
	}
}

export class RepeatCache<T = unknown> {
	private cache: NodeCache;

	constructor() {
		this.cache = new NodeCache({useClones: false, stdTTL: 600, deleteOnExpire: true});
	}

	addData(group: number, user: number, data: T): Node<T> {
		let node: Node<T> = this.getNode(group, data);
		node.addUser(user);
		return node;
	}

	getNode(group: number, data: T): Node<T> {
		let node = this.cache.get<Node<T>>(group);
		if (node === undefined || node.msg !== data) {
			node = new Node(data);
			this.cache.set(group, node, 600);
		}
		return node;
	}
}

