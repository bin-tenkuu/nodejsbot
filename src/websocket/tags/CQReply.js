const CQTag = require('./CQTag')

module.exports = class CQReply extends CQTag {
  constructor(id) {
    super('reply', {id})
  }

  get id() {
    return this.data.id;
  }

  coerce() {
    this.data.id = Number(this.data.id)
    return this
  }
}