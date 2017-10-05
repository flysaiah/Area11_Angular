export class User {
  constructor(
    public username: String,
    public password: String,
    public friends?: String[]
  ) {}
}
