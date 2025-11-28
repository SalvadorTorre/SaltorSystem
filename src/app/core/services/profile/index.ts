export interface ProfileStateModel {
  status:  string;
  code:    number;
  message: string;
  data:    ProfileStateData[];
}

export interface ProfileStateData {
  StateID:           number;
  StateNameValue:    string;
  StateAbbreviation: string;
  CreateDate:        Date;
}
