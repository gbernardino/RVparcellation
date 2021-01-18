export class Dictionary{
    constructor() {
      this.data = {};
    }
    get(k, callbackIfKeyNotFound = null) {
      if (this.data[k] === undefined && callbackIfKeyNotFound === null)  {
        this.set(k, callbackIfKeyNotFound())
        return this.data[k]
      }
      else if (this.data[k] === undefined) { 
        throw  Object.assign(
          new Error('${k} not in dictionary'),
          { code: 400 }
       );
      }
      else {
        return this.data[k]
      }
    }
  
    set(k, v){
      this.data[k]= v;
    }
    keys() {
      return Object.keys(this.data)
    }
    length() {
      return this.keys().length
    }
  }
  
  export class MeshesList extends Dictionary {
    //Class representing all meshes of all patients (saved as BLOBS of a single patient. Relies on the correct index, and the correct format)
  
  
    addNewFile(file) {
  
      //TODO: check name is correct.
      //END TODO
  
      let nameSplit = file.name.split('_');
      let pId = nameSplit.slice(0, -1).join('_');
      let time = parseInt(nameSplit[nameSplit.length - 1].split('.')[0]);
      if (! (pId in this.data) ) {
        this.set(pId, new Dictionary());
      }
  
  
      let patient = this.get(pId);
      patient.set(time, file);
    }
  
    removeFile(pId) {
      console.log('Removing', pId)
      console.log(this)
      delete this.data[pId]
    }
  
    isOK() {
      //Returns OK if the files is complete: ie, if there are all the frames from 0 to max
      return  this.keys().every(k => this.get(k).keys() === Math.max(...this.get(k).keys()) );
      }
  }
  