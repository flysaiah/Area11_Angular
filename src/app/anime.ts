export class Anime {
  constructor(
    public user: string,
    public name: string,
    public description?: string,
    public rating?: number,
    public thumbnail?: string,
    public malID?: number,
    public category?: string,
    public _id?: string,
    public comments?: string[],
    public isFinalist?: boolean
  ) {}
}
