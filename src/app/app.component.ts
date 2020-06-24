import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx'
import { Chart } from 'chart.js';
import { FormsModule } from '@angular/forms';
import { a } from '@angular/core/src/render3';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  file: any;
  arrayBuffer: any;
  filelist: any;
  testingError = false;
  chart: any;
  predchart:any;
  parameter: any;
  reliability: any;
  newreliability:any;
  prediction = false;
  newparameter: any;
  selectedWeek;
  releaseTime: any;
  cost = {testing : 0, operational: 0, unitTesting: 0, estimated_cost: 0}

  constructor(private httpClient: HttpClient) {
  }

  ngOnInit() {
  }

  addfile(event) {
    this.testingError = false;
    this.file = event.target.files[0];
    let fileReader = new FileReader();
    fileReader.readAsArrayBuffer(this.file);
    fileReader.onload = (e) => {
      this.arrayBuffer = fileReader.result;
      var data = new Uint8Array(this.arrayBuffer);
      var arr = new Array();
      for (var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
      var bstr = arr.join("");
      var workbook = XLSX.read(bstr, { type: "binary" });
      var first_sheet_name = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[first_sheet_name];
      console.log(XLSX.utils.sheet_to_json(worksheet, { raw: true }));
      this.filelist = XLSX.utils.sheet_to_json(worksheet, { raw: true });
    }
  }

  uploadDocument(file) {
    if (this.filelist.length > 0) {
      this.testingError = true;
    }
    this.newErrorPerWeek()
  }

  newErrorPerWeek() {
    var Weeks = this.filelist.map(item => item.W)
    var CF = this.filelist.map(item => item.CF);
    var errorPerWeek = CF;
    console.log(CF)
    for (var i = errorPerWeek.length - 1; i > 0; i--) {
      errorPerWeek[i] = errorPerWeek[i] - errorPerWeek[i - 1];
    }
    console.log(errorPerWeek);
    this.chart = new Chart('canvas', {
      type: 'bar',
      data: {
        labels: Weeks,
        datasets: [
          {
            label: 'Errors',
            data: errorPerWeek,
            backgroundColor: 'Aqua',
          }
        ]
      },
      options: {
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Errors'
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Weeks'
            }
          }]
        }
      }
    });
  }

  getEmployee() {
    var data = JSON.stringify(this.filelist);
    this.httpClient.post('http://127.0.0.1:5002/employees',this.filelist).subscribe(data => {
      this.parameter = data as JSON;
      console.log(this.parameter);
      this.reliability = this.hypothesis(this.parameter[0], this.parameter[1], this.filelist[this.filelist.length - 1].W)/this.parameter[0];
    })
  }

  getPredParameter()
  {
    console.log(this.selectedWeek);
    var temp = this.filelist.slice(0, this.selectedWeek);
    console.log(temp);
    this.httpClient.post('http://127.0.0.1:5002/employees', temp).subscribe(data => {
      this.newparameter = data as JSON;
      console.log(this.newparameter)
      this.newreliability = this.hypothesis(this.newparameter[0], this.newparameter[1], temp[temp.length - 1].W)/this.newparameter[0];
    })

  }

  hypothesis(a, b, x)
  {
    return a * (1- Math.exp(-b * x))
  }

  errorFunctionGraph()
  {
    var Weeks = this.filelist.map(item => item.W);
    var m_t = [];
    for(var i = 0; i < Weeks.length; i++)
    {
      m_t.push(this.hypothesis(this.parameter[0], this.parameter[1], Weeks[i]));
    }
    this.chart = new Chart('mt', {
      type: 'line',
      data: {
        labels: Weeks,
        datasets: [
          {
            label: 'Errors',
            data: m_t,
            backgroundColor: 'aqua',
          }
        ]
      },
      options: {
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Faults solved'
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Weeks'
            }
          }]
        }
      }
    });
    this.prediction = true;
  }


  estimate_cost()
  {
    var t = this.hypothesis(this.newparameter[0], this.newparameter[1], this.selectedWeek)
    console.log(this.filelist[-1])
    var t1 = this.hypothesis(this.parameter[0], this.parameter[1], this.filelist[this.filelist.length - 1]['W'])
    this.cost.estimated_cost = (this.cost.testing * t) + (this.cost.operational * (t1 - t)) + this.cost.unitTesting ;
  }

  predict_release_time()
  {
    var temp = this.filelist.slice(0, this.selectedWeek).map(item => item.CF)
    var predweeks = this.filelist.slice(0, this.selectedWeek).map(item => item.W)
    var diff = [...temp];
    for(var i = diff.length - 1; i > 0 ; i--)
    {
      diff[i] = diff[i] - diff[i - 1];
    }
    var add = diff[diff.length - 1]
    for(var i = diff.length - 1; i > 0 ; i--)
    {
      diff[i] = diff[i] - diff[i - 1];
    }
    diff[0] = 0;
    var rate = diff.reduce((acc, val) => acc + val) / diff.length;
    console.log(rate);
    if(rate >= 0)
    {
      rate = -1;
    }
    var len = predweeks.length
    for(var i = 0; add > 0; i++)
    {
      add = add + rate;
      temp.push((temp[temp.length - 1 ] + add));
      predweeks.push(predweeks[len - 1] + i + 1)
    }
    if(predweeks.length == temp.length)
    {
      console.log(predweeks)
      console.log(temp) 
    }
    this.releaseTime=predweeks.length
    this.predchart = new Chart('pred_Weeks', {
      type: 'line',
      data: {
        labels: predweeks,
        datasets: [
          {
            label: 'Errors',
            data: temp,
            backgroundColor: 'aqua',
          }
        ],
        options: {
          scales: {
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Predicted Errors'
              }
            }],
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Weeks'
              }
            }]
          }
        }
      }
    });
  }
}
