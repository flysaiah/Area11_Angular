export class User {
  constructor(
    public username: string,
    public password: string,
    public bestgirl: string,
    public friends?: string[],
    public avatar?: string
  ) {}
}
