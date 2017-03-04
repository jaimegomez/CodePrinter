class Match {
  constructor(key, colStart, rule) {
    Object.assign(this, rule);
    this.key = key;
    this.colStart = colStart;
    this.colEnd = colStart + key.length;
  }
}

export default Match;
