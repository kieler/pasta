// import * as chai from 'chai';
// import * as rewire from 'rewire';

// const should = chai.should();
// const app = rewire('../extension/src-language-server/stpa/modelChecking/model-checking.ts');

// describe('#notProvidedLTL(variables, action)', () => {    
//     it('should return G ((variables) -> (controlAction==action))', () => {
//         const notProvidedLTL = app.__get__('notProvidedLTL'); 
//         const variables = "variables"
//         const action = "action"
//         const ltl = notProvidedLTL(variables, action)
//         ltl.formula.should.equal("G ((variables) -> (controlAction==action))")
//     });
// });

// describe('#providedLTL(variables, action)', () => {    
//     it('should return G ((variables) -> !(controlAction==action))', () => {
//         const providedLTL = app.__get__('providedLTL'); 
//         const variables = "variables"
//         const action = "action"
//         const ltl = providedLTL(variables, action)
//         ltl.formula.should.equal("G ((variables) -> !(controlAction==action))")
//     });
// });

// describe('#tooEarlyLTL(variables, action)', () => {    
//     it('should return G (((controlAction==action) -> (variables)) && !((controlAction==action)U(variables)))', () => {
//         const tooEarlyLTL = app.__get__('tooEarlyLTL'); 
//         const variables = "variables"
//         const action = "action"
//         const ltl = tooEarlyLTL(variables, action)
//         ltl.formula.should.equal("G (((controlAction==action) -> (variables)) && !((controlAction==action)U(variables)))")
//     });
// });

// describe('#tooLateLTL(variables, action)', () => {    
//     it('should return G (((variables) -> (controlAction==action)) && !((variables)U(controlAction==action)))', () => {
//         const tooLateLTL = app.__get__('tooLateLTL'); 
//         const variables = "variables"
//         const action = "action"
//         const ltl = tooLateLTL(variables, action)
//         ltl.formula.should.equal("G (((variables) -> (controlAction==action)) && !((variables)U(controlAction==action)))")
//     });
// });