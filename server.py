from flask import Flask, request
from flask_cors import CORS, cross_origin
from flask_restful import Resource, Api
from json import dumps
from flask_jsonpify import jsonify
import random
import numpy as np
import json
import pandas as pd
import random
import time
import seaborn as sns
app = Flask(__name__)
api = Api(app)
app.config["DEBUG"] = True
CORS(app)



def hypothesis(a, b, x):
	return a * (1 - np.exp(-b * x))


def mse_loss(a, b, x, y):
    preds = hypothesis(a, b, x)
    return np.sum((preds - y) ** 2) / x.shape[0]

def simulated_annealing(temp, cooling_rate, x, y, seed=None, start_vals=None):
    def acceptance_probability(energy, new_energy, temp):
        if new_energy < energy:
            return 1.0

        return np.exp((energy - new_energy) / temp)

    if seed:
        random.seed(seed)

    if start_vals:
        current_a, current_b = start_vals
    else:
        current_a, current_b = random.uniform(-100, 1000), random.uniform(-100, 1000)

    best_a, best_b, minimal_loss = current_a, current_b, \
                 mse_loss(current_a, current_b, x, y)

    current_loss = minimal_loss

    while temp > 1:
        a, b = random.uniform(current_a-3, current_a+3), random.uniform(current_b-3, current_b+3)
        #a, b = random.uniform(-100, 1000), random.uniform(-100, 1000)

        curr_energy = current_loss
        neigh_energy = mse_loss(a, b, x, y)

        if(acceptance_probability(curr_energy, neigh_energy, temp) > random.random()):
            current_loss = neigh_energy
            current_a, current_b = a, b

        if current_loss < minimal_loss:
            minimal_loss = current_loss
            best_a, best_b = current_a, current_b

        temp *= 1-cooling_rate
    return best_a, best_b

def run_simulated_annealing(a, b):    
    vals = None
    x = np.array(a)
    y = np.array(b)
    cooling_rate = 1e-2
    for i in range(50):
        print("Run ", i+1)
        vals = simulated_annealing(1e30, cooling_rate, x, y, seed=i, start_vals=vals)
        cooling_rate -= 1e-5

    return vals



@app.route("/")
def hello():
    return jsonify({'text':'Hello World!'})
     
class Employees_Name(Resource):
    def post(self):
        print("Abhishek")
        data = request.get_data()
        arr = json.loads(data)
        x = []
        y = []
        for i in range(len(arr)):
            x.append(arr[i]['W']) 
            y.append(arr[i]['CF'])
        print(x)
        print(y)
        output = run_simulated_annealing(x, y)
        print(output)
        return jsonify(output) 


api.add_resource(Employees_Name, '/employees') # Route_3


if __name__ == '__main__':
     app.run(port=5002)