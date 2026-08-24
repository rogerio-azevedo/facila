export type MunicipalCadastroActivity = {
  cTribMun: string;
  xTribMun?: string;
  pAliq?: string;
};

export type ConsultarCadastroMunicipalSuccess = {
  success: true;
  statusCadastro?: string;
  xNome?: string;
  atividades: MunicipalCadastroActivity[];
};

export type ConsultarCadastroMunicipalFailure = {
  success: false;
  message: string;
};

export type ConsultarCadastroMunicipalResult =
  | ConsultarCadastroMunicipalSuccess
  | ConsultarCadastroMunicipalFailure;
