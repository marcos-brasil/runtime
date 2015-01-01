
import * as c0 from 'c0'

var { expect } = chai

export default function () {

  describe('bugs', function(){
    it('#92', function(done){

      function fakeSetImmediate (fn) {

        return (err) => {
          setImmediate(() => {
            try { fn(err) }
            catch (e) {
              expect(e.message).to.equal('boom')
              done()
            }
          })
        }

      }

      c0(function *() {
        yield function (done) {
          done(new Error('boom'))
        }
      })(fakeSetImmediate(function(err) {
        if (err) { throw err }
      }))
    })
  })

}

