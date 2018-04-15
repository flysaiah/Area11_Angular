export class Anime {
  constructor(
    public user: string,
    public name: string,
    public description?: string,
    public rating?: number,
    public thumbnail?: string,
    public malID?: string,
    public category?: string,
    public _id?: string,
    public comments?: string[],
    public isFinalist?: boolean,
    public genres?: string[],
    public startDate?: string,
    public endDate?: string,
    public type?: string,
    public englishTitle?: string,
    public status?: string,
    public recommenders?: Object[],
    public ownerIsRecommender?: boolean,
    public hasNewSeason?: boolean
  ) {}
}
