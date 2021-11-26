import {Parser} from "node-expat";
import {Logable} from "@U/logger.js";

export interface Xml {
	readonly name: string;
	readonly attrs: { [key: string]: string };
	readonly childs: Xml[];
	push(node: Xml | string): void;
}

class BaseXml implements Xml {
	name: string;
	attrs: { [key: string]: string };
	childs: Xml[] = [];
	isText: boolean = true;
	_text: string;

	constructor(name: string, attr: { [key: string]: string } = {}, text: string = "") {
		this.name = name;
		this.attrs = attr;
		this._text = text;
	}

	push(node: Xml | string): void {
		if (this.isText) {
			if (typeof node === "string") {
				this._text += node;
				return;
			}
			this.isText = false;
			if (this._text.trim() !== "") {
				this.childs.push(new BaseXml("<text>", {}, this._text));
			}
			this._text = "";
		} else if (typeof node === "string") {
			if (node.trim() !== "") {
				this.childs.push(new BaseXml("<text>", {}, node));
			}
			return;
		}
		this.childs.push(node);
	}

	get text() {
		return this._text;
	}
}

export class RootXml implements Xml {
	public xmlDecl?: {
		version: string, encoding: string, standalone: string
	} = undefined;
	private _child: [Xml] | [] = [];

	push(node: Xml): number {
		if (this._child.length === 1) {
			return 1;
		}
		this._child = [node];
		return 1;
	}

	get name(): string {
		return "<root>";
	}

	get attrs(): {} {
		return {};
	};

	get childs(): Xml[] {
		return this._child;
	};

	get root(): Xml | undefined {
		return this._child[0];
	}
}

// noinspection JSUnusedLocalSymbols
export class XMLParser extends Logable {
	private root: RootXml = new RootXml();
	private struct: Xml[] = [];
	private currentNode: Xml = this.root;
	private lastNode: Xml = this.root;

	constructor(data: Buffer | string) {
		super();
		const parser: Parser = new Parser("UTF-8");
		parser.on("startElement", this.startElement.bind(this));
		parser.on("endElement", this.endElement.bind(this));
		parser.on("text", this.text.bind(this));
		parser.on("error", this.error.bind(this));
		parser.on("processingInstruction", this.processingInstruction.bind(this));
		parser.on("comment", this.comment.bind(this));
		parser.on("xmlDecl", this.xmlDecl.bind(this));
		parser.on("entityDecl", this.entityDecl.bind(this));
		parser.on("close", this.close.bind(this));
		parser.end(data);
	}

	protected error(error: any) {
		this.logger.error("error", error);
	}

	protected text(text: string) {
		this.currentNode.push(text);
	}

	protected endElement(name: string) {
		this.lastNode = this.currentNode;
		this.currentNode = <Xml>this.struct.pop();
	}

	protected close() {
		// console.log("close");
	}

	protected startElement(name: string, attrs: { [p: string]: string }) {
		const xml: Xml = new BaseXml(name, attrs);
		this.currentNode.push(xml);
		this.struct.push(this.currentNode);
		this.currentNode = xml;
	}

	protected processingInstruction(target: string, data: string) {
		// console.log("processingInstruction", target, data);
	}

	protected comment(s: string) {
		// console.log("comment", s);
	}

	protected xmlDecl(version: string, encoding: string, standalone: string) {
		this.root.xmlDecl = {
			version, encoding, standalone,
		};
	}

	protected entityDecl(entityName: any, isParameterEntity: any, value: any, base: any, systemId: any, publicId: any,
			notationName: any) {
		// console.log("entityDecl", entityName, isParameterEntity, value, base, systemId, publicId, notationName);
	}

	get Node(): RootXml {
		return this.root;
	}
}
