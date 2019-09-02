from flask import Flask
from flask_restful import Resource, Api, request
from flask_cors import CORS
import sys

app = Flask(__name__)
api = Api(app)
CORS(app)

class HelloWorld(Resource):
    def get(self):
        return {'hello': 'world'}

api.add_resource(HelloWorld, '/')


@app.route('/computePartitionSingleIndividual', methods = [ 'POST',])
def computePartitionSingleIndividual():
    numFiles = 1
    print('meow', file=sys.stderr)

    print(request, file=sys.stderr)
    print(request.files, file=sys.stderr)

    file = request.files[0]
    print(request, flush=True)

if __name__ == '__main__':
    app.run(debug=True,  host='0.0.0.0')