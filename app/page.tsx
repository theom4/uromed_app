ne p-0 text-sm text-green-700 dark:text-green-300 focus:ring-0 focus:outline-none"
                           />
                          </div>
                        </div>
                        
                        {/* Update History Button */}
                        <div className="flex justify-center mt-4">
                          <Button
                            onClick={handleUpdateHistory}
                            disabled={isUpdatingHistory}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                          >
                            {isUpdatingHistory ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Actualizează...</span>
                              </div>
                            ) : (
                              'Actualizează istoric'
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right Side - Consultation History */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Istoric Consultații</h4>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-600 max-h-64 overflow-y-auto">
                      {foundPatient.consultatii && foundPatient.consultatii.length > 0 ? (
                        <div className="space-y-3">
                          {foundPatient.consultatii.map((consultatie: any, index: number) => (
                            <div key={index} className="bg-white dark:bg-green-800/20 rounded-lg p-3 border border-green-200 dark:border-green-600">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                  Consultația #{index + 1}
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  {consultatie.data || 'Data necunoscută'}
                                </span>
                              </div>
                              <div className="text-sm text-green-700 dark:text-green-300">
                                {consultatie.descriere || consultatie.diagnostic || 'Fără descriere disponibilă'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <div className="text-sm text-green-600 dark:text-green-400">
                            Nu există consultații anterioare înregistrate
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-600">
                      <div className="text-sm text-green-700 dark:text-green-300">
                        <strong>Ultima evaluare:</strong> Pacient evaluat pentru suspiciune proces proliferativ prostatic, cu aspecte sugestive imagistice și PSA. Plan: tuseu rectal, PSA total/free, RMN multiparametric, biopsie prostatică ghidată.
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Vezi Detalii Complete
                      </Button>
                    </div>
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Document Generation */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Generare Document Medical</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Input Text */}
              <div>
                <Label htmlFor="input-text" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Informații Medicale
                </Label>
                <Textarea
                  id="input-text"
                  placeholder="Introduceți informațiile medicale aici..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="mt-2 min-h-[200px] resize-none"
                />
              </div>

              {/* Document Type */}
              <div>
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tipul Documentului
                </Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selectați tipul documentului medical" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spitalizare-zi">Spitalizare de Zi</SelectItem>
                    <SelectItem value="examen-clinic">Examen Clinic</SelectItem>
                    <SelectItem value="recomandari-medicale">Recomandări Medicale</SelectItem>
                    <SelectItem value="consultatie-urologica">Consultația Urologică</SelectItem>
                    <SelectItem value="scrisoare-medicala">Scrisoare Medicală</SelectItem>
                    <SelectItem value="interpretare-analiza">Interpretare Analiză</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateDocument}
                disabled={isGenerating || !inputText.trim() || !documentType}
                className="w-full h-12 text-white font-medium text-lg bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generează Document...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Generează Document Medical</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Document - Now at the bottom */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center space-x-2 text-slate-800 dark:text-white">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Document Generat</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {outputText ? (
                <div className="space-y-4">
                  <Textarea
                    value={outputText}
                    onChange={(e) => setOutputText(e.target.value)}
                    className="min-h-[400px] max-h-[600px] resize-y text-sm font-mono leading-relaxed"
                    placeholder="Documentul generat va apărea aici..."
                  />
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(outputText)}
                      className="flex items-center space-x-2"
                    >
                      <span>Copiază</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <span>Descarcă</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Documentul generat va apărea aici
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Completați informațiile medicale și selectați tipul documentului
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}