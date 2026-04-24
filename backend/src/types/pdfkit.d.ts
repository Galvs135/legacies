declare module "pdfkit" {
  class PDFDocument {
    constructor(options?: Record<string, unknown>);
    on(event: "data", callback: (chunk: Buffer) => void): this;
    on(event: "end", callback: () => void): this;
    on(event: "error", callback: (error: Error) => void): this;
    fontSize(size: number): this;
    text(text: string): this;
    moveDown(lines?: number): this;
    end(): void;
  }
  export default PDFDocument;
}
