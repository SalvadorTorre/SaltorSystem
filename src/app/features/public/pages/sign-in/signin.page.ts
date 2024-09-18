import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ProfileService } from 'src/app/core/services/profile/profile.service';

declare var $: any;

@Component({
  selector: 'app-signin',
  templateUrl: './signin.page.html',
  styleUrls: ['./signin.page.scss']
})
export class SignInPage implements OnInit {

  myFormCreate!: FormGroup;
  isLoading: boolean = false;


  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private readonly router: Router,

  ) { }

  ngOnInit() {
    this.buildFormCreate();
  }

  buildFormCreate() {
    this.myFormCreate = this.formBuilder.group({
      username: ['', [Validators.required]],
      userpassword: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.myFormCreate.valid) {
      this.isLoading = true;
      this.authService.login(this.myFormCreate.value).subscribe(response => {
        if (response.code === 200) {
          this.router.navigate(['/private']);
        } else {
          this.isLoading = false;
          alert("Error al iniciar sesión");
        }
        //this.router.navigate(['/private']);
        console.log(response);

      });
    }
  }





}
