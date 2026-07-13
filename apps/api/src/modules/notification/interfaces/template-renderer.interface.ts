export interface TemplateRenderer {
  render(templateName: string, data: any): Promise<string>;
}
