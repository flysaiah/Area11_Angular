export class TopTens {
  constructor(
    public group: string,
    public category: string,
    public user?: string,
    public entries?: {
      name: string,
      viewerPrefs: {member: string, shouldHide: boolean}[]
    }[],
    public hasNoContent?: boolean,
    public isSelected?: boolean
  ) {}
}
