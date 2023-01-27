declare const ytl: {
  bind<HResult>(
    h: (type: any, props: ([unknown, unknown?] | unknown)[], ...children: any[]) => HResult
  ): (strings: TemplateStringsArray, ...values: any[]) => HResult | HResult[];
};
export default ytl;
