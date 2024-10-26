import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ModeloFpago, ModeloFpagoData } from 'src/app/core/services/mantenimientos/fpago';
import { ServicioFpago } from 'src/app/core/services/mantenimientos/fpago/fpago.service';
declare var $: any; declare var $: any;
import Swal from 'sweetalert2';
