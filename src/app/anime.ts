export class Anime {
  constructor(
    public name: string,
    public description?: string,
    public rating?: number,
    public thumbnail?: string,
    public malID?: number,
    public category?: string,
    public mongoID?: number,
    public user?: string,
    public comments?: string[]
  ) {}
}
