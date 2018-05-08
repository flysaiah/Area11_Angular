export class Era {
  constructor(
    public name: string,
    public entries: string[],
    public startDate?: string,
    public endDate?: string,
    public location?: string,
    public metadata?: string,
    public subHeader?: string,
    public backgroundColor?: string,
    public whiteText?: boolean
  ) {}
}
