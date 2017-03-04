import Branch from 'Branch';

class LinesTree extends Branch {
  constructor() {
    const branch = new Branch(true, []);
    super(false, [branch]);
    branch.parent = this;
  }
}

export default LinesTree;
