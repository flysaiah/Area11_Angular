export class Infolist {
  constructor(
    public name: string,
    public entries: { anime: string, info: string }[],
    public user?: string,
    public isSelected?: boolean
  ) {}
}
