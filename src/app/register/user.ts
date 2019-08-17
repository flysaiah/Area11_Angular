export class User {
  constructor(
    public username: string,
    public password: string,
    public bestgirl: string,
    public bioDisplay: string,
    public avatar?: string,
    public group?: string,
    public autoTimelineAdd?: boolean,
    public fireworks?: boolean,
    public bestboy?: string,
    public warnMe?: boolean
  ) {}
}
