import { Component, ViewChild } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexXAxis,
  ApexPlotOptions
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
};

@Component({
  selector: 'home',
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home {
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions: Partial<ChartOptions>;

  constructor() {
    this.chartOptions = {
      series: [
        {
          name: "Ganancias",
          data: [40000, 43000, 28000, 47000, 54000, 12500, 69300, 45050, 12800, 13800, 12300, 50000,32000]
        }
      ],
      chart: {
        type: "bar",
        height: 500
      },
      plotOptions: {
        bar: {
          horizontal: false
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: [
          "Central hierro ",
          "Todo hierro (Boca chica)",
          "Canal hierro( herrera )",
          "Canal hierro(mano -guayabo)",
          "Max hierro (villa mella )",
          "Max hierro (sabana)",
          "Quinto hierro (alcarrizo )",
          "Quinto hierro (villa Altagracia)",
          "Quinto hierro (hato nuevo )",
          "Gigante hierro ( san Cristóbal)",
          "Gigante hierro (Bani)",
          "Gigante hierro (Barahona)",
          "Gigante hierro (Haina)",
        ]
      }
    };
  }
}
