declare module '*.css?inline' {
  const content: string;
  export default content;
}

interface JQuery {
  quploader(options?: any, ...args: any[]): any;
}
