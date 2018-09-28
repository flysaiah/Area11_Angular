export class Group {
  constructor(
    public name: string,
    public members: {
      id: string,
      username: string,
      bestgirl: string,
      isPending: boolean,
      avatar: string
    }[],
    public countdown: { name: string, date: Date },
    public avatar?: string
  ) {}
}
