export class Group {
  constructor(
    public name: string,
    public members: {
      id: string,
      username: string,
      isPending: boolean
    }[]
  ) {}
}
