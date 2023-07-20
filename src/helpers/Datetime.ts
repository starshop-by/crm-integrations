import moment from 'moment';
import "moment/locale/ru.js";
moment().locale("ru");

export class DateTime {

  static getDaysInMonth(year: any, month: any) {
    return moment(`${year}-${month}`, "YYYY-MM").daysInMonth();
  }

  static getFirstDayOfMonth(year: any, month: any) {
    const currentMonth = moment().format("MM");

    const currentYear = moment().format("YYYY");

    const firstDayOfMonth = moment(`${year}-${month}-01`).format("YYYY-MM-DD")

    return firstDayOfMonth;
  }

  static getDateFromString(string: any) {
    const dateString = moment(string, 'YYYY-MM-DD').format("YYYY-MM-DD");

    return dateString;
  }

  static getPastDaysFromNow(number: any) {
    if (number === 0) {
      return moment().format("YYYY-MM-DD");
    }

    return moment().subtract(number, "days").format("YYYY-MM-DD");
  }

  static getTimeNow = () => {
    return moment().format("LT");
  }

  static getCurrentHour() {
    return Number(moment().format("HH"));
  }

}