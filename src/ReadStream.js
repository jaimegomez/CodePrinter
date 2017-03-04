import EventEmitter from 'EventEmitter';

class ReadStream extends EventEmitter {
  constructor(doc, transform) {
    super();

    const stack = [];
    const le = doc.getOption('lineEnding') || '\n';
    let dl = doc.get(0);

    const reader = () => {
      const random = 25 + 50 * Math.random();
      let i = -1;

      while (dl && ++i < random) {
        stack.push(transform(dl.text));
        dl = dl.next();
      }

      if (i >= 0) {
        this.emit('data', stack.join(le));
        stack = [''];
        schedule(reader);
      } else {
        this.emit('end');
      }
    };

    schedule(reader);

    return this;
  }

  pipe(stream) {
    if (stream) {
      typeof stream.write === 'function' && this.on('data', data => stream.write(data));
      typeof stream.end === 'function' && this.on('end', () => stream.end());
    }
    return stream;
  }
}

export default ReadStream;
